# 🎯 نظام التقارير التفاعلية والتعاونية

# Interactive and Collaborative Reporting System

**التاريخ:** 14 يناير 2026  
**الإصدار:** 4.5  
**الحالة:** ✅ نظام تفاعلي متقدم

---

## 👥 التعاون الجماعي في التقارير

### 1️⃣ نظام التحرير الجماعي

```python
"""
نظام تحرير تقارير جماعي في الوقت الفعلي
"""

class CollaborativeReportEditor:
    """محرر تقارير تعاوني"""

    def __init__(self):
        from socketio import Server

        self.sio = Server()
        self.active_sessions = {}
        self.edit_locks = {}
        self.version_history = {}

    def create_collaboration_session(self, report_id, creator_id):
        """إنشاء جلسة تعاون"""
        session_id = self._generate_session_id()

        self.active_sessions[session_id] = {
            'report_id': report_id,
            'creator': creator_id,
            'participants': [creator_id],
            'created_at': datetime.utcnow(),
            'active_editors': {},
            'chat_messages': [],
            'changes_queue': []
        }

        return {
            'session_id': session_id,
            'join_url': f'/reports/{report_id}/collaborate/{session_id}',
            'participants': [creator_id]
        }

    def join_session(self, session_id, user_id):
        """الانضمام إلى جلسة تعاون"""
        if session_id not in self.active_sessions:
            raise ValueError("جلسة التعاون غير موجودة")

        session = self.active_sessions[session_id]

        if user_id not in session['participants']:
            session['participants'].append(user_id)

            # إشعار المشاركين الآخرين
            self._broadcast_user_joined(session_id, user_id)

        return {
            'session': session,
            'current_document': self._get_current_document(session['report_id']),
            'active_editors': session['active_editors']
        }

    def update_document(self, session_id, user_id, changes):
        """تحديث المستند مع المزامنة"""
        session = self.active_sessions[session_id]

        # تطبيق التغييرات
        change_record = {
            'id': self._generate_change_id(),
            'user_id': user_id,
            'timestamp': datetime.utcnow(),
            'changes': changes,
            'type': changes['type']  # insert, delete, modify
        }

        # إضافة إلى قائمة التغييرات
        session['changes_queue'].append(change_record)

        # المزامنة مع المشاركين الآخرين
        self._broadcast_changes(session_id, change_record)

        # حفظ في السجل
        self._add_to_version_history(session['report_id'], change_record)

        return {
            'success': True,
            'change_id': change_record['id'],
            'applied_at': change_record['timestamp']
        }

    def add_comment(self, session_id, user_id, comment_data):
        """إضافة تعليق على جزء من التقرير"""
        comment = {
            'id': self._generate_comment_id(),
            'user_id': user_id,
            'text': comment_data['text'],
            'position': comment_data['position'],  # موقع التعليق في المستند
            'thread': [],  # للردود
            'resolved': False,
            'created_at': datetime.utcnow()
        }

        # حفظ التعليق
        self._save_comment(session_id, comment)

        # إشعار المشاركين
        self._broadcast_comment(session_id, comment)

        return comment

    def suggest_change(self, session_id, user_id, suggestion):
        """اقتراح تعديل (بدون تطبيقه مباشرة)"""
        suggestion_obj = {
            'id': self._generate_suggestion_id(),
            'user_id': user_id,
            'type': 'suggestion',
            'original_text': suggestion['original'],
            'suggested_text': suggestion['suggested'],
            'position': suggestion['position'],
            'reason': suggestion.get('reason', ''),
            'status': 'pending',  # pending, accepted, rejected
            'created_at': datetime.utcnow()
        }

        # حفظ الاقتراح
        self._save_suggestion(session_id, suggestion_obj)

        # إشعار المشاركين
        self._broadcast_suggestion(session_id, suggestion_obj)

        return suggestion_obj

    def accept_suggestion(self, session_id, suggestion_id, reviewer_id):
        """قبول اقتراح تعديل"""
        suggestion = self._get_suggestion(suggestion_id)

        if suggestion:
            # تطبيق التغيير
            changes = {
                'type': 'modify',
                'position': suggestion['position'],
                'old_value': suggestion['original_text'],
                'new_value': suggestion['suggested_text']
            }

            self.update_document(session_id, reviewer_id, changes)

            # تحديث حالة الاقتراح
            suggestion['status'] = 'accepted'
            suggestion['reviewed_by'] = reviewer_id
            suggestion['reviewed_at'] = datetime.utcnow()

            self._broadcast_suggestion_status(session_id, suggestion)

        return suggestion

    def chat_message(self, session_id, user_id, message):
        """إرسال رسالة في الدردشة"""
        session = self.active_sessions[session_id]

        chat_msg = {
            'id': self._generate_message_id(),
            'user_id': user_id,
            'text': message,
            'timestamp': datetime.utcnow(),
            'mentions': self._extract_mentions(message)
        }

        session['chat_messages'].append(chat_msg)

        # بث الرسالة
        self._broadcast_chat_message(session_id, chat_msg)

        return chat_msg

    def get_version_history(self, report_id):
        """جلب تاريخ الإصدارات"""
        if report_id not in self.version_history:
            return []

        history = self.version_history[report_id]

        return {
            'versions': history,
            'total_changes': len(history),
            'contributors': list(set(v['user_id'] for v in history))
        }

    def restore_version(self, report_id, version_id):
        """استعادة إصدار سابق"""
        version = self._get_version(report_id, version_id)

        if version:
            # استعادة المحتوى
            current_content = self._get_current_document(report_id)

            # حفظ الحالة الحالية كنسخة احتياطية
            self._backup_current_version(report_id, current_content)

            # تطبيق الإصدار القديم
            self._apply_version(report_id, version)

            return {
                'success': True,
                'restored_version': version_id,
                'restored_at': datetime.utcnow()
            }

        return {'success': False, 'error': 'الإصدار غير موجود'}
```

---

## 🎨 واجهة مستخدم تفاعلية متقدمة

### 1️⃣ مكونات React التفاعلية

```javascript
// InteractiveReportViewer.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Toolbar, IconButton, Tooltip, Drawer, List, ListItem, Chip, Avatar, Badge } from '@mui/material';
import {
  Comment as CommentIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon,
  Timeline as TimelineIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { io } from 'socket.io-client';

const InteractiveReportViewer = ({ reportId, userId }) => {
  const [report, setReport] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [comments, setComments] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // تحميل التقرير
    loadReport(reportId);

    // الاتصال بـ WebSocket
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // الانضمام إلى غرفة التقرير
    newSocket.emit('join_report_room', { reportId, userId });

    // الاستماع للتحديثات
    newSocket.on('user_joined', handleUserJoined);
    newSocket.on('user_left', handleUserLeft);
    newSocket.on('comment_added', handleNewComment);
    newSocket.on('content_updated', handleContentUpdate);

    return () => {
      newSocket.disconnect();
    };
  }, [reportId, userId]);

  const loadReport = async id => {
    try {
      const response = await fetch(`/api/reports/${id}`);
      const data = await response.json();
      setReport(data.report);
    } catch (error) {
      console.error('Error loading report:', error);
    }
  };

  const handleUserJoined = data => {
    setActiveUsers(prev => [...prev, data.user]);
  };

  const handleUserLeft = data => {
    setActiveUsers(prev => prev.filter(u => u.id !== data.user.id));
  };

  const handleNewComment = comment => {
    setComments(prev => [...prev, comment]);
  };

  const handleContentUpdate = update => {
    setReport(prev => ({
      ...prev,
      content: applyUpdate(prev.content, update),
    }));
  };

  const addComment = useCallback(
    (text, position) => {
      if (socket) {
        socket.emit('add_comment', {
          reportId,
          userId,
          text,
          position,
        });
      }
    },
    [socket, reportId, userId],
  );

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 50));
  };

  const handleDownload = async format => {
    try {
      const response = await fetch(`/api/reports/${reportId}/download/${format}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${reportId}.${format}`;
      a.click();
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Toolbar */}
      <Toolbar
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bgcolor: 'background.paper',
          zIndex: 1000,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Active Users */}
          <Box sx={{ display: 'flex', mr: 2 }}>
            {activeUsers.map(user => (
              <Tooltip key={user.id} title={user.name}>
                <Avatar
                  src={user.avatar}
                  sx={{
                    width: 32,
                    height: 32,
                    ml: -1,
                    border: 2,
                    borderColor: 'background.paper',
                  }}
                />
              </Tooltip>
            ))}
            <Chip icon={<PeopleIcon />} label={activeUsers.length} size="small" sx={{ ml: 1 }} />
          </Box>

          {/* Zoom Controls */}
          <Tooltip title="تصغير">
            <IconButton onClick={handleZoomOut} size="small">
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>

          <Chip label={`${zoom}%`} size="small" />

          <Tooltip title="تكبير">
            <IconButton onClick={handleZoomIn} size="small">
              <ZoomInIcon />
            </IconButton>
          </Tooltip>

          {/* Actions */}
          <Tooltip title="التعليقات">
            <IconButton onClick={() => setShowComments(!showComments)} color={showComments ? 'primary' : 'default'}>
              <Badge badgeContent={comments.length} color="error">
                <CommentIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="سجل الإصدارات">
            <IconButton onClick={() => setShowVersionHistory(!showVersionHistory)}>
              <TimelineIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="تنزيل PDF">
            <IconButton onClick={() => handleDownload('pdf')}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="طباعة">
            <IconButton onClick={() => window.print()}>
              <PrintIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="ملء الشاشة">
            <IconButton onClick={() => document.documentElement.requestFullscreen()}>
              <FullscreenIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      {/* Main Content */}
      <Box
        sx={{
          flexGrow: 1,
          mt: 8,
          p: 3,
          overflow: 'auto',
        }}
      >
        {report && <ReportContent report={report} zoom={zoom} onAddComment={addComment} />}
      </Box>

      {/* Comments Drawer */}
      <Drawer anchor="right" open={showComments} onClose={() => setShowComments(false)} sx={{ width: 350 }}>
        <CommentsPanel comments={comments} onAddComment={addComment} />
      </Drawer>

      {/* Version History Drawer */}
      <Drawer anchor="right" open={showVersionHistory} onClose={() => setShowVersionHistory(false)} sx={{ width: 350 }}>
        <VersionHistoryPanel reportId={reportId} />
      </Drawer>
    </Box>
  );
};

export default InteractiveReportViewer;
```

---

## 📱 تطبيق الموبايل الكامل

### 1️⃣ تطبيق React Native

```javascript
// MobileReportApp.jsx

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import { Card, Button, FAB, Portal, Provider, Searchbar, Chip, Avatar, Menu, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import DocumentPicker from 'react-native-document-picker';
import FileViewer from 'react-native-file-viewer';
import RNFS from 'react-native-fs';

const MobileReportApp = () => {
  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const response = await fetch('http://api.example.com/reports');
      const data = await response.json();
      setReports(data.reports);
    } catch (error) {
      Alert.alert('خطأ', 'فشل تحميل التقارير');
    }
  };

  const downloadReport = async (reportId, format) => {
    try {
      const url = `http://api.example.com/reports/${reportId}/download/${format}`;
      const downloadDest = `${RNFS.DocumentDirectoryPath}/report_${reportId}.${format}`;

      const result = await RNFS.downloadFile({
        fromUrl: url,
        toFile: downloadDest,
      }).promise;

      if (result.statusCode === 200) {
        Alert.alert('تم التنزيل', 'هل تريد فتح التقرير؟', [
          { text: 'لا', style: 'cancel' },
          {
            text: 'نعم',
            onPress: () => FileViewer.open(downloadDest),
          },
        ]);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل تنزيل التقرير');
    }
  };

  const shareReport = async report => {
    try {
      await Share.share({
        message: `تقرير: ${report.title}\n${report.summary}`,
        url: report.share_url,
        title: report.title,
      });
    } catch (error) {
      Alert.alert('خطأ', 'فشل مشاركة التقرير');
    }
  };

  const renderReportCard = report => (
    <Card key={report.id} style={styles.card}>
      <Card.Title
        title={report.title}
        subtitle={report.date}
        left={props => <Avatar.Icon {...props} icon="file-document" style={styles.avatar} />}
        right={props => (
          <Menu
            visible={report.menuVisible}
            onDismiss={() => toggleMenu(report.id, false)}
            anchor={<IconButton {...props} icon="dots-vertical" onPress={() => toggleMenu(report.id, true)} />}
          >
            <Menu.Item onPress={() => downloadReport(report.id, 'pdf')} title="تنزيل PDF" icon="download" />
            <Menu.Item onPress={() => downloadReport(report.id, 'excel')} title="تنزيل Excel" icon="file-excel" />
            <Menu.Item onPress={() => shareReport(report)} title="مشاركة" icon="share" />
            <Divider />
            <Menu.Item onPress={() => deleteReport(report.id)} title="حذف" icon="delete" />
          </Menu>
        )}
      />

      <Card.Content>
        <Text style={styles.summary}>{report.summary}</Text>

        {/* Tags */}
        <View style={styles.tagsContainer}>
          <Chip icon="account" style={styles.chip}>
            {report.beneficiary_count} مستفيد
          </Chip>
          <Chip icon="calendar" style={styles.chip}>
            {report.period}
          </Chip>
          <Chip icon="chart-line" style={styles.chip} textStyle={{ color: '#28a745' }}>
            {report.improvement_rate}%
          </Chip>
        </View>

        {/* Mini Chart Preview */}
        {report.chart_preview && (
          <LineChart data={report.chart_preview} width={300} height={150} chartConfig={chartConfig} bezier style={styles.chart} />
        )}
      </Card.Content>

      <Card.Actions>
        <Button mode="contained" onPress={() => viewReport(report.id)} icon="eye">
          عرض
        </Button>
        <Button mode="outlined" onPress={() => downloadReport(report.id, 'pdf')} icon="download">
          تنزيل
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <Provider>
      <View style={styles.container}>
        {/* Search Bar */}
        <Searchbar placeholder="بحث في التقارير..." onChangeText={setSearchQuery} value={searchQuery} style={styles.searchBar} />

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          <Chip selected={selectedFilter === 'all'} onPress={() => setSelectedFilter('all')} style={styles.filterChip}>
            الكل
          </Chip>
          <Chip selected={selectedFilter === 'individual'} onPress={() => setSelectedFilter('individual')} style={styles.filterChip}>
            فردية
          </Chip>
          <Chip selected={selectedFilter === 'progress'} onPress={() => setSelectedFilter('progress')} style={styles.filterChip}>
            تقدم
          </Chip>
          <Chip selected={selectedFilter === 'group'} onPress={() => setSelectedFilter('group')} style={styles.filterChip}>
            جماعية
          </Chip>
        </ScrollView>

        {/* Reports List */}
        <ScrollView style={styles.scrollView}>
          {reports
            .filter(r => selectedFilter === 'all' || r.type === selectedFilter)
            .filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(renderReportCard)}
        </ScrollView>

        {/* FAB for new report */}
        <FAB style={styles.fab} icon="plus" label="تقرير جديد" onPress={() => navigation.navigate('NewReport')} />
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterChip: {
    marginRight: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 3,
  },
  avatar: {
    backgroundColor: '#667eea',
  },
  summary: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  chart: {
    marginTop: 12,
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#667eea',
  },
});

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
  style: {
    borderRadius: 16,
  },
};

export default MobileReportApp;
```

---

## 🔔 نظام الإشعارات المتقدم

### 1️⃣ مركز الإشعارات

```python
"""
مركز إشعارات متقدم مع تخصيص كامل
"""

class NotificationCenter:
    """مركز إشعارات ذكي"""

    def __init__(self):
        self.notification_types = self._load_notification_types()
        self.user_preferences = {}
        self.notification_queue = []

    def _load_notification_types(self):
        """أنواع الإشعارات المتاحة"""
        return {
            'report_ready': {
                'name': 'تقرير جاهز',
                'icon': '📊',
                'priority': 'high',
                'channels': ['push', 'email', 'in_app'],
                'template': 'report_ready'
            },
            'report_shared': {
                'name': 'تمت المشاركة',
                'icon': '🔗',
                'priority': 'medium',
                'channels': ['push', 'email', 'in_app'],
                'template': 'report_shared'
            },
            'comment_added': {
                'name': 'تعليق جديد',
                'icon': '💬',
                'priority': 'medium',
                'channels': ['push', 'in_app'],
                'template': 'comment_added'
            },
            'mention': {
                'name': 'تم ذكرك',
                'icon': '@',
                'priority': 'high',
                'channels': ['push', 'email', 'in_app'],
                'template': 'mention'
            },
            'scheduled_report': {
                'name': 'تقرير مجدول',
                'icon': '⏰',
                'priority': 'medium',
                'channels': ['email'],
                'template': 'scheduled_report'
            },
            'expiry_warning': {
                'name': 'تحذير انتهاء الصلاحية',
                'icon': '⚠️',
                'priority': 'high',
                'channels': ['push', 'email', 'in_app'],
                'template': 'expiry_warning'
            },
            'anomaly_detected': {
                'name': 'اكتشاف انحراف',
                'icon': '🚨',
                'priority': 'critical',
                'channels': ['push', 'email', 'sms', 'in_app'],
                'template': 'anomaly_detected'
            },
            'goal_achieved': {
                'name': 'تحقيق هدف',
                'icon': '🎯',
                'priority': 'medium',
                'channels': ['push', 'in_app'],
                'template': 'goal_achieved'
            },
            'milestone_reached': {
                'name': 'بلوغ معلم',
                'icon': '🏆',
                'priority': 'medium',
                'channels': ['push', 'email', 'in_app'],
                'template': 'milestone_reached'
            },
            'data_update': {
                'name': 'تحديث بيانات',
                'icon': '🔄',
                'priority': 'low',
                'channels': ['in_app'],
                'template': 'data_update'
            }
        }

    def send_notification(self, notification_config):
        """إرسال إشعار مع تخصيص كامل"""
        # جلب تفضيلات المستخدم
        user_prefs = self._get_user_preferences(notification_config['user_id'])

        # التحقق من الإعدادات
        if not self._should_send(notification_config, user_prefs):
            return {'success': False, 'reason': 'user_preferences'}

        # تخصيص المحتوى
        content = self._customize_notification(
            notification_config,
            user_prefs
        )

        # تحديد القنوات
        channels = self._select_channels(
            notification_config['type'],
            user_prefs
        )

        # الإرسال عبر القنوات
        results = {}
        for channel in channels:
            result = self._send_via_channel(
                channel,
                notification_config['user_id'],
                content
            )
            results[channel] = result

        # التسجيل
        self._log_notification(notification_config, results)

        return {
            'success': True,
            'channels': results,
            'notification_id': self._generate_notification_id()
        }

    def create_notification_digest(self, user_id, period='daily'):
        """إنشاء ملخص إشعارات دوري"""
        # جمع الإشعارات
        notifications = self._get_user_notifications(user_id, period)

        if not notifications:
            return None

        # تجميع حسب النوع
        grouped = {}
        for notif in notifications:
            notif_type = notif['type']
            if notif_type not in grouped:
                grouped[notif_type] = []
            grouped[notif_type].append(notif)

        # إنشاء الملخص
        digest = {
            'user_id': user_id,
            'period': period,
            'generated_at': datetime.utcnow(),
            'total_notifications': len(notifications),
            'by_type': {
                k: {
                    'count': len(v),
                    'notifications': v[:5]  # أول 5 فقط
                }
                for k, v in grouped.items()
            },
            'important_notifications': [
                n for n in notifications
                if n['priority'] in ['high', 'critical']
            ]
        }

        return digest

    def manage_notification_preferences(self, user_id, preferences):
        """إدارة تفضيلات الإشعارات"""
        self.user_preferences[user_id] = {
            'channels': {
                'email': preferences.get('email_enabled', True),
                'sms': preferences.get('sms_enabled', False),
                'push': preferences.get('push_enabled', True),
                'in_app': preferences.get('in_app_enabled', True)
            },
            'quiet_hours': {
                'enabled': preferences.get('quiet_hours_enabled', False),
                'start': preferences.get('quiet_hours_start', '22:00'),
                'end': preferences.get('quiet_hours_end', '08:00')
            },
            'frequency': {
                'immediate': preferences.get('immediate_notifications', []),
                'digest': preferences.get('digest_notifications', []),
                'digest_frequency': preferences.get('digest_frequency', 'daily')
            },
            'notification_types': preferences.get('notification_types', {})
        }

        return self.user_preferences[user_id]
```

---

**آخر تحديث:** 14 يناير 2026  
**الحالة:** ✅ نظام تفاعلي وتعاوني متقدم
