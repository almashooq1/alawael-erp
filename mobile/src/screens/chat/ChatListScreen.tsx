/**
 * ChatListScreen — conversations list with unread badges + new-chat modal.
 *
 * Tapping a row should `navigate('Chat', { conversationId })` — wiring
 * the inner thread screen is left to the app-level navigator.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { chat, type Conversation, type ChatContact } from '../../services/modules';

function displayName(p: any): string {
  if (!p) return '—';
  return (
    p.firstName_ar ||
    p.name ||
    `${p.firstName || ''} ${p.lastName || ''}`.trim() ||
    p.email ||
    '—'
  );
}

function initial(s: string) {
  return (s || '?').trim().charAt(0);
}

function timeLabel(d?: string): string {
  if (!d) return '';
  const date = new Date(d);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'أمس';
  return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
}

export default function ChatListScreen({
  onOpenConversation,
}: {
  onOpenConversation?: (conversationId: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [newModal, setNewModal] = useState<{
    open: boolean;
    loading: boolean;
    contacts: ChatContact[];
    filter: string;
  }>({ open: false, loading: false, contacts: [], filter: '' });

  const load = useCallback(async () => {
    setError('');
    try {
      const items = await chat.conversations();
      setConversations(items);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'فشل التحميل');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread || 0), 0),
    [conversations]
  );

  const openNew = async () => {
    setNewModal({ open: true, loading: true, contacts: [], filter: '' });
    try {
      const items = await chat.contacts();
      setNewModal(m => ({ ...m, loading: false, contacts: items }));
    } catch (e: any) {
      setNewModal(m => ({ ...m, loading: false }));
      Alert.alert('خطأ', e?.response?.data?.message || 'فشل تحميل جهات الاتصال');
    }
  };

  const startConversation = async (contact: ChatContact) => {
    try {
      const conv = await chat.findOrCreate(contact._id);
      setNewModal(m => ({ ...m, open: false }));
      if (onOpenConversation && conv?._id) onOpenConversation(conv._id);
      await load();
    } catch (e: any) {
      Alert.alert('خطأ', e?.response?.data?.message || 'فشل إنشاء المحادثة');
    }
  };

  const groupedContacts = useMemo(() => {
    const filter = newModal.filter.trim().toLowerCase();
    const filtered = newModal.contacts.filter(c => {
      if (!filter) return true;
      return (
        c.name?.toLowerCase().includes(filter) ||
        c.email?.toLowerCase().includes(filter) ||
        c.role?.toLowerCase().includes(filter)
      );
    });
    const groups: Record<string, ChatContact[]> = {};
    for (const c of filtered) {
      const key = c.category || 'أخرى';
      (groups[key] = groups[key] || []).push(c);
    }
    return groups;
  }, [newModal.filter, newModal.contacts]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>الرسائل</Text>
          <Text style={styles.subtitle}>
            {totalUnread > 0 ? `${totalUnread} رسالة غير مقروءة` : 'كل الرسائل محدَّثة'}
          </Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={openNew}>
          <Text style={styles.newBtnText}>＋ جديد</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1976d2" />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {conversations.length === 0 && !error ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>لا توجد محادثات</Text>
              <Text style={styles.emptyText}>
                اضغط "جديد" لبدء محادثة مع المعالج أو ولي أمر.
              </Text>
            </View>
          ) : null}

          {conversations.map(c => (
            <TouchableOpacity
              key={c._id}
              style={styles.row}
              onPress={() => onOpenConversation?.(c._id)}
              activeOpacity={0.7}
            >
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial(displayName(c.other))}</Text>
                </View>
                {c.unread > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{c.unread > 99 ? '99+' : c.unread}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.content}>
                <View style={styles.topLine}>
                  <Text style={styles.name}>{displayName(c.other)}</Text>
                  <Text style={styles.time}>{timeLabel(c.lastActivityAt)}</Text>
                </View>
                <Text
                  style={[styles.lastMsg, c.unread > 0 && styles.lastMsgUnread]}
                  numberOfLines={1}
                >
                  {c.lastMessage?.content || 'لا توجد رسائل بعد'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={newModal.open} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>محادثة جديدة</Text>
            <TextInput
              style={styles.modalSearch}
              placeholder="ابحث بالاسم أو البريد…"
              value={newModal.filter}
              onChangeText={v => setNewModal(m => ({ ...m, filter: v }))}
              textAlign="right"
            />
            {newModal.loading ? (
              <ActivityIndicator size="large" color="#1976d2" style={{ marginTop: 40 }} />
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {Object.keys(groupedContacts).length === 0 ? (
                  <Text style={styles.modalEmpty}>
                    لا توجد جهات اتصال متاحة. جرّب تسجيل دخول كمعالج/ولي أمر.
                  </Text>
                ) : null}
                {Object.keys(groupedContacts).map(cat => (
                  <View key={cat}>
                    <Text style={styles.modalGroup}>{cat}</Text>
                    {groupedContacts[cat].map(c => (
                      <TouchableOpacity
                        key={c._id}
                        style={styles.contactRow}
                        onPress={() => startConversation(c)}
                      >
                        <View style={styles.contactAvatar}>
                          <Text style={styles.contactAvatarText}>{initial(c.name)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.contactName}>{c.name}</Text>
                          <Text style={styles.contactMeta}>{c.email || c.role || ''}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setNewModal(m => ({ ...m, open: false }))}
            >
              <Text style={styles.modalCloseText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', textAlign: 'right' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2, textAlign: 'right' },
  newBtn: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { padding: 12, backgroundColor: '#fee2e2', margin: 12, borderRadius: 8 },
  errorText: { color: '#991b1b', textAlign: 'right' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyIcon: { fontSize: 64, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  emptyText: { fontSize: 13, color: '#6b7280', marginTop: 6, textAlign: 'center' },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarWrap: { position: 'relative', marginLeft: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1976d2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    backgroundColor: '#ef4444',
    borderRadius: 999,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  content: { flex: 1 },
  topLine: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  time: { fontSize: 11, color: '#9ca3af' },
  lastMsg: { fontSize: 13, color: '#6b7280', marginTop: 2, textAlign: 'right' },
  lastMsgUnread: { color: '#111827', fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'right', marginBottom: 12 },
  modalSearch: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  modalEmpty: { textAlign: 'center', color: '#6b7280', padding: 30 },
  modalGroup: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'right',
  },
  contactRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  contactAvatarText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  contactName: { fontSize: 14, fontWeight: '500', color: '#111827', textAlign: 'right' },
  contactMeta: { fontSize: 11, color: '#6b7280', textAlign: 'right' },
  modalClose: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: { color: '#6b7280', fontSize: 14 },
});
